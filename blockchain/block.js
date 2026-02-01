import { sha256 } from "./hash.js";

export class Block {
  constructor(index, timestamp, userId, data, previousHash = "") {
    this.index = index;
    this.timestamp = timestamp;
    this.userId = userId;
    this.data = data; // ANY data (JSON / string / object)
    this.previousHash = previousHash;
    this.hash = "";
  }

  async calculateHash() {
    return await sha256(
      this.index +
      this.timestamp +
      this.userId +
      JSON.stringify(this.data) +
      this.previousHash
    );
  }

  async seal() {
    this.hash = await this.calculateHash();
  }
}
