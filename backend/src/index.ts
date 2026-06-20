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

// 1. Create a new brew record
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
      pressure
    } = req.body;

    if (!bean_name) {
      return res.status(400).json({ error: 'Bean name is required' });
    }

    const id = randomUUID();
    const timestamp = created_at ? new Date(created_at).toISOString() : new Date().toISOString();
    const typeOfBrew = brew_type || 'pour_over';

    await db.run(
      `INSERT INTO coffee_brews (
        id, bean_name, grind_size, water_temp, coffee_weight, water_weight, 
        brew_time, rating, notes, created_at, brew_type, liquid_weight, 
        preinfusion_time, pressure
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        bean_name,
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
        pressure !== undefined ? parseFloat(pressure) : null
      ]
    );

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

const PORT = Number(process.env.PORT) || 3001;

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Coffee Timer Backend is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database and server:', err);
});
