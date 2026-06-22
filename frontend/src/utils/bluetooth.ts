/**
 * Web Bluetooth API Utility for connecting to Smart Coffee Scales (Acaia, Felicita, Decent)
 * and providing real-time weight notifications at 10Hz.
 * Includes a Mock Simulation mode for testing without a physical scale.
 */

export class CoffeeScaleBluetooth {
  private device: any = null;
  private characteristic: any = null;
  private weightCallback: ((weight: number) => void) | null = null;
  private disconnectCallback: (() => void) | null = null;
  private isSimulated = false;
  private simulationInterval: NodeJS.Timeout | null = null;
  private simulatedWeight = 0;

  constructor() {}

  /**
   * Request and connect to a coffee scale via Web Bluetooth
   */
  async connect(onWeight: (weight: number) => void, onDisconnect: () => void, simulated = false): Promise<string> {
    this.weightCallback = onWeight;
    this.disconnectCallback = onDisconnect;
    this.isSimulated = simulated;

    if (simulated) {
      this.startSimulation();
      return "Simulated Coffee Scale";
    }

    const nav = typeof window !== "undefined" ? (navigator as any) : null;
    if (!nav || !nav.bluetooth) {
      throw new Error("此瀏覽器不支援 Web Bluetooth API，請使用 Chrome、Edge 或 Opera！");
    }

    try {
      // Common BT Serial Service UUIDs (ffe0 represents many serial scales like Felicita, Acaia, Skale)
      const serviceUuid = "0000ffe0-0000-1000-8000-00805f9b34fb";
      const charUuid = "0000ffe1-0000-1000-8000-00805f9b34fb";

      this.device = await nav.bluetooth.requestDevice({
        filters: [
          { services: [serviceUuid] },
          { namePrefix: "Acaia" },
          { namePrefix: "Felicita" },
          { namePrefix: "Decent" },
          { namePrefix: "Arc" }
        ],
        optionalServices: [serviceUuid, "battery_service"]
      });

      if (!this.device.gatt) {
        throw new Error("無法取得藍牙設備的 GATT 伺服器！");
      }

      this.device.addEventListener("gattserverdisconnected", () => {
        this.handleDisconnect();
      });

      const server = await this.device.gatt.connect();
      const service = await server.getPrimaryService(serviceUuid);
      this.characteristic = await service.getCharacteristic(charUuid);

      // Start notifications
      await this.characteristic.startNotifications();
      this.characteristic.addEventListener("characteristicvaluechanged", (event: any) => {
        this.parseWeightPacket(event.target.value);
      });

      return this.device.name || "Bluetooth 咖啡秤";
    } catch (error: any) {
      this.cleanup();
      throw error;
    }
  }

  /**
   * Parse weights from raw binary packet.
   * Supports common Acaia/Felicita packet structures.
   */
  private parseWeightPacket(value: DataView) {
    try {
      // General Acaia/Felicita parsing rules:
      // Typically, packets are structured like: header bytes, payload length, type, weight bytes, checkSum.
      // E.g., weight can be represented in grams as value.getInt16(index, littleEndian) / 10 or 100.
      // Let's parse standard Felicita/Acaia v2 notification format:
      if (value.byteLength >= 7) {
        // Read weight value from typical offsets
        let weight = 0;
        
        // Example Felicita Arc / Acaia payload format:
        // Byte 4-5 is signed weight integer in grams * 10
        const rawWeight = value.getInt16(4, false); // big-endian
        weight = rawWeight / 10;

        if (this.weightCallback && !isNaN(weight) && weight > -100 && weight < 1000) {
          this.weightCallback(weight);
        }
      }
    } catch (e) {
      console.warn("解析藍牙秤封包錯誤:", e);
    }
  }

  /**
   * Start mock weight simulation for debugging/testing
   */
  private startSimulation() {
    this.simulatedWeight = 0;
    let elapsed = 0;

    this.simulationInterval = setInterval(() => {
      elapsed += 0.1; // 10Hz tick
      
      // Simulate typical espresso flow rate
      if (elapsed > 4) { // preinfusion finishes at 4s
        // flow rate increases to ~2g/s, then slows down as shot proceeds
        let flowRate = 2.0;
        if (elapsed > 15) flowRate = 1.4;
        if (elapsed > 25) flowRate = 0.8;
        
        this.simulatedWeight += flowRate * 0.1; // add fraction
        this.simulatedWeight = parseFloat(this.simulatedWeight.toFixed(1));
      }

      if (this.weightCallback) {
        this.weightCallback(this.simulatedWeight);
      }
    }, 100);
  }

  private handleDisconnect() {
    if (this.disconnectCallback) {
      this.disconnectCallback();
    }
    this.cleanup();
  }

  private cleanup() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.device = null;
    this.characteristic = null;
    this.weightCallback = null;
    this.disconnectCallback = null;
    this.isSimulated = false;
  }

  /**
   * Disconnect scale and stop simulation
   */
  disconnect() {
    if (this.isSimulated) {
      this.cleanup();
      return;
    }

    if (this.device && this.device.gatt && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.cleanup();
  }
}
