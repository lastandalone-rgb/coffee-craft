import express from 'express';
import cors from 'cors';
import { initDB, db } from './db';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Remote log collector for debugging mobile devices
app.post('/api/logs', (req, res) => {
  console.log('📱 [MOBILE LOG]', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// 1. Create a new brew record (with optional inventory deduction and telemetry data points)
app.post('/api/brews', async (req, res) => {
  try {
    const { 
      bean_name, 
      grind_size, 
      water_temp, 
      coffee_weight, 
      water_weight, 
      brew_time, 
      rating, 
      notes, 
      created_at,
      brew_type,
      liquid_weight,
      preinfusion_time,
      pressure,
      bean_id,
      telemetry // array of { time: number, yield: number, flow: number, pressure: number }
    } = req.body;

    let finalBeanName = bean_name;
    let finalBeanId = bean_id || null;

    const id = randomUUID();
    const timestamp = created_at ? new Date(created_at).toISOString() : new Date().toISOString();
    const typeOfBrew = brew_type || 'pour_over';

    // Begin database transaction for atomic brew + telemetry write
    await db.run('BEGIN TRANSACTION');

    try {
      // If bean_id is provided, look up the bean in the inventory and deduct stock
      if (finalBeanId) {
        const beanRecord = await db.get('SELECT * FROM coffee_beans WHERE id = ?', [finalBeanId]);
        if (beanRecord) {
          finalBeanName = beanRecord.name;
          
          // Deduct dry coffee weight from stock if coffee_weight is provided
          if (coffee_weight !== undefined && coffee_weight !== null) {
            const usedWeight = parseFloat(coffee_weight);
            if (!isNaN(usedWeight)) {
              const newWeight = Math.max(0, (beanRecord.current_weight || 0) - usedWeight);
              await db.run('UPDATE coffee_beans SET current_weight = ? WHERE id = ?', [newWeight, finalBeanId]);
            }
          }
        }
      }

      if (!finalBeanName) {
        await db.run('ROLLBACK');
        return res.status(400).json({ error: 'Bean name or Bean ID is required' });
      }

      await db.run(
        `INSERT INTO coffee_brews (
          id, bean_name, grind_size, water_temp, coffee_weight, water_weight, 
          brew_time, rating, notes, created_at, brew_type, liquid_weight, 
          preinfusion_time, pressure, bean_id
        )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          finalBeanName,
          grind_size || null,
          water_temp !== undefined ? parseFloat(water_temp) : null,
          coffee_weight !== undefined ? parseFloat(coffee_weight) : null,
          water_weight !== undefined ? parseFloat(water_weight) : null,
          brew_time !== undefined ? parseInt(brew_time) : null,
          rating !== undefined ? parseInt(rating) : null,
          notes || null,
          timestamp,
          typeOfBrew,
          liquid_weight !== undefined ? parseFloat(liquid_weight) : null,
          preinfusion_time !== undefined ? parseInt(preinfusion_time) : null,
          pressure !== undefined ? parseFloat(pressure) : null,
          finalBeanId
        ]
      );

      // Insert telemetry data points if present
      if (telemetry && Array.isArray(telemetry) && telemetry.length > 0) {
        const stmt = await db.prepare(
          `INSERT INTO brew_telemetry_points (brew_id, time_offset, yield, flow_rate, pressure)
           VALUES (?, ?, ?, ?, ?)`
        );
        for (const pt of telemetry) {
          await stmt.run([
            id,
            pt.time !== undefined ? parseFloat(pt.time) : 0,
            pt.yield !== undefined ? parseFloat(pt.yield) : null,
            pt.flow !== undefined ? parseFloat(pt.flow) : null,
            pt.pressure !== undefined ? parseFloat(pt.pressure) : null
          ]);
        }
        await stmt.finalize();
      }

      await db.run('COMMIT');
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }

    const newBrew = await db.get('SELECT * FROM coffee_brews WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: newBrew });
  } catch (error) {
    console.error('Error creating brew:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Get historical brews
app.get('/api/brews', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const brew_type = req.query.brew_type as string;

    let query = `SELECT * FROM coffee_brews`;
    let countQuery = `SELECT count(*) as count FROM coffee_brews`;
    const params: any[] = [];

    if (brew_type) {
      query += ` WHERE brew_type = ?`;
      countQuery += ` WHERE brew_type = ?`;
      params.push(brew_type);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const queryParams = [...params, limit, offset];

    const brews = await db.all(query, queryParams);
    const total = await db.get<{ count: number }>(countQuery, params);

    res.json({
      success: true,
      data: brews,
      pagination: {
        limit,
        offset,
        total: total?.count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching brews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Delete a brew record
app.delete('/api/brews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.run('DELETE FROM coffee_brews WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Brew record not found' });
    }

    res.json({ success: true, message: 'Brew record deleted successfully' });
  } catch (error) {
    console.error('Error deleting brew:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Retrieve statistics (Daily, Weekly, Monthly) filtered by brew_type
app.get('/api/brews/stats', async (req, res) => {
  try {
    const brew_type = req.query.brew_type as string || 'pour_over';

    // 4.1 General Stats
    const generalStats = await db.get(`
      SELECT 
        COUNT(*) as total_brews,
        ROUND(AVG(rating), 1) as avg_rating,
        ROUND(AVG(coffee_weight), 1) as avg_coffee_weight,
        ROUND(AVG(water_weight), 1) as avg_water_weight,
        ROUND(AVG(liquid_weight), 1) as avg_liquid_weight,
        ROUND(AVG(brew_time), 0) as avg_brew_time,
        ROUND(AVG(preinfusion_time), 0) as avg_preinfusion_time,
        ROUND(AVG(water_temp), 1) as avg_water_temp,
        ROUND(AVG(pressure), 1) as avg_pressure
      FROM coffee_brews
      WHERE brew_type = ?
    `, [brew_type]);

    // Favorite/most popular bean
    const favoriteBean = await db.get(`
      SELECT bean_name, COUNT(*) as count 
      FROM coffee_brews 
      WHERE brew_type = ?
      GROUP BY bean_name 
      ORDER BY count DESC 
      LIMIT 1
    `, [brew_type]);

    // 4.2 Daily reports (Last 7 days of brewing)
    const dailyStats = await db.all(`
      SELECT 
        date(created_at, 'localtime') as date_label,
        COUNT(*) as count,
        ROUND(SUM(coffee_weight), 1) as total_coffee,
        ROUND(SUM(CASE WHEN brew_type = 'espresso' THEN liquid_weight ELSE water_weight END), 1) as total_water
      FROM coffee_brews
      WHERE brew_type = ? AND created_at >= datetime('now', '-7 days')
      GROUP BY date_label
      ORDER BY date_label ASC
    `, [brew_type]);

    // 4.3 Weekly reports (Last 8 weeks of brewing)
    const weeklyStats = await db.all(`
      SELECT 
        strftime('%Y-W%W', created_at, 'localtime') as week_label,
        COUNT(*) as count,
        ROUND(SUM(coffee_weight), 1) as total_coffee,
        ROUND(SUM(CASE WHEN brew_type = 'espresso' THEN liquid_weight ELSE water_weight END), 1) as total_water
      FROM coffee_brews
      WHERE brew_type = ? AND created_at >= datetime('now', '-8 weeks')
      GROUP BY week_label
      ORDER BY week_label ASC
    `, [brew_type]);

    // 4.4 Monthly reports (Last 6 months of brewing)
    const monthlyStats = await db.all(`
      SELECT 
        strftime('%Y-%m', created_at, 'localtime') as month_label,
        COUNT(*) as count,
        ROUND(SUM(coffee_weight), 1) as total_coffee,
        ROUND(SUM(CASE WHEN brew_type = 'espresso' THEN liquid_weight ELSE water_weight END), 1) as total_water,
        ROUND(AVG(rating), 1) as avg_rating
      FROM coffee_brews
      WHERE brew_type = ? AND created_at >= datetime('now', '-6 months')
      GROUP BY month_label
      ORDER BY month_label ASC
    `, [brew_type]);

    res.json({
      success: true,
      data: {
        summary: {
          ...generalStats,
          favorite_bean: favoriteBean?.bean_name || '無'
        },
        daily: dailyStats,
        weekly: weeklyStats,
        monthly: monthlyStats
      }
    });
  } catch (error) {
    console.error('Error generating stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Register a new bag of coffee beans in inventory
app.post('/api/inventory/beans', async (req, res) => {
  try {
    const { name, roaster, roast_date, roast_level, origin, process, initial_weight } = req.body;
    if (!name || !roast_date) {
      return res.status(400).json({ error: 'Name and roast date are required' });
    }
    const id = randomUUID();
    const initial = initial_weight !== undefined ? parseFloat(initial_weight) : null;
    
    await db.run(
      `INSERT INTO coffee_beans (id, name, roaster, roast_date, roast_level, origin, process, initial_weight, current_weight)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, roaster || null, roast_date, roast_level || null, origin || null, process || null, initial, initial]
    );
    const newBean = await db.get('SELECT * FROM coffee_beans WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: newBean });
  } catch (error) {
    console.error('Error creating bean inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Retrieve active coffee beans list with roast aging alerts
app.get('/api/inventory/beans/active', async (req, res) => {
  try {
    const beans = await db.all('SELECT * FROM coffee_beans WHERE is_active = 1 ORDER BY roast_date DESC');
    
    const updatedBeans = beans.map(bean => {
      const roastDate = new Date(bean.roast_date);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - roastDate.getTime());
      const daysSinceRoast = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let peak_status = '熟成中 (Resting)';
      const level = bean.roast_level || 'medium';
      
      if (level === 'light') {
        if (daysSinceRoast >= 14 && daysSinceRoast <= 45) peak_status = '黃金賞味期 (Peak)';
        else if (daysSinceRoast > 45) peak_status = '已過熟成期 (Post-Peak)';
      } else if (level === 'medium') {
        if (daysSinceRoast >= 7 && daysSinceRoast <= 30) peak_status = '黃金賞味期 (Peak)';
        else if (daysSinceRoast > 30) peak_status = '已過熟成期 (Post-Peak)';
      } else { // dark
        if (daysSinceRoast >= 4 && daysSinceRoast <= 21) peak_status = '黃金賞味期 (Peak)';
        else if (daysSinceRoast > 21) peak_status = '已過熟成期 (Post-Peak)';
      }
      
      return {
        ...bean,
        days_since_roast: daysSinceRoast,
        peak_status
      };
    });
    
    res.json({ success: true, data: updatedBeans });
  } catch (error) {
    console.error('Error fetching active bean inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6.2 Update a coffee bean in inventory
app.put('/api/inventory/beans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, roaster, roast_date, roast_level, origin, process, current_weight, is_active } = req.body;
    
    const bean = await db.get('SELECT * FROM coffee_beans WHERE id = ?', [id]);
    if (!bean) {
      return res.status(404).json({ error: 'Coffee bean record not found' });
    }
    
    await db.run(
      `UPDATE coffee_beans SET 
        name = ?, 
        roaster = ?, 
        roast_date = ?, 
        roast_level = ?, 
        origin = ?, 
        process = ?, 
        current_weight = ?,
        is_active = ?
       WHERE id = ?`,
      [
        name !== undefined ? name : bean.name,
        roaster !== undefined ? roaster : bean.roaster,
        roast_date !== undefined ? roast_date : bean.roast_date,
        roast_level !== undefined ? roast_level : bean.roast_level,
        origin !== undefined ? origin : bean.origin,
        process !== undefined ? process : bean.process,
        current_weight !== undefined && current_weight !== "" ? parseFloat(current_weight) : bean.current_weight,
        is_active !== undefined ? (is_active ? 1 : 0) : bean.is_active,
        id
      ]
    );
    
    const updatedBean = await db.get('SELECT * FROM coffee_beans WHERE id = ?', [id]);
    res.json({ success: true, data: updatedBean });
  } catch (error) {
    console.error('Error updating coffee bean:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. Update a brew record (notes/rating/parameters)
app.put('/api/brews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      notes, 
      rating,
      grind_size,
      water_temp,
      coffee_weight,
      water_weight,
      brew_time,
      liquid_weight,
      preinfusion_time,
      pressure
    } = req.body;
    
    const brew = await db.get('SELECT * FROM coffee_brews WHERE id = ?', [id]);
    if (!brew) {
      return res.status(404).json({ error: 'Brew record not found' });
    }
    
    await db.run(
      `UPDATE coffee_brews SET 
        notes = ?, 
        rating = ?, 
        grind_size = ?, 
        water_temp = ?, 
        coffee_weight = ?, 
        water_weight = ?, 
        brew_time = ?, 
        liquid_weight = ?, 
        preinfusion_time = ?, 
        pressure = ?
       WHERE id = ?`,
      [
        notes !== undefined ? notes : brew.notes, 
        rating !== undefined ? parseInt(rating) : brew.rating, 
        grind_size !== undefined ? grind_size : brew.grind_size,
        water_temp !== undefined && water_temp !== "" ? parseFloat(water_temp) : brew.water_temp,
        coffee_weight !== undefined && coffee_weight !== "" ? parseFloat(coffee_weight) : brew.coffee_weight,
        water_weight !== undefined && water_weight !== "" ? parseFloat(water_weight) : brew.water_weight,
        brew_time !== undefined && brew_time !== "" ? parseInt(brew_time) : brew.brew_time,
        liquid_weight !== undefined && liquid_weight !== "" ? parseFloat(liquid_weight) : brew.liquid_weight,
        preinfusion_time !== undefined && preinfusion_time !== "" ? parseInt(preinfusion_time) : brew.preinfusion_time,
        pressure !== undefined && pressure !== "" ? parseFloat(pressure) : brew.pressure,
        id
      ]
    );
    
    const updatedBrew = await db.get('SELECT * FROM coffee_brews WHERE id = ?', [id]);
    res.json({ success: true, data: updatedBrew });
  } catch (error) {
    console.error('Error updating brew:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 8. Get details of a single brew along with its telemetry points
app.get('/api/brews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const brew = await db.get('SELECT * FROM coffee_brews WHERE id = ?', [id]);
    
    if (!brew) {
      return res.status(404).json({ error: 'Brew record not found' });
    }

    const telemetry = await db.all(
      'SELECT time_offset as time, yield, flow_rate as flow, pressure FROM brew_telemetry_points WHERE brew_id = ? ORDER BY time_offset ASC',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...brew,
        telemetry
      }
    });
  } catch (error) {
    console.error('Error fetching single brew details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = Number(process.env.PORT) || 3001;

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Coffee Timer Backend is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database and server:', err);
});
