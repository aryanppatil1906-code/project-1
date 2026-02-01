import { Block } from "./block.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { db } from "../firebase/config.js";

export class Blockchain {

  constructor() {
    this.collectionRef = collection(db, "blocks");
  }

  async getLastBlock() {
    const q = query(this.collectionRef, orderBy("index", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : snapshot.docs[0].data();
  }

  async addBlock(userId, data) {

    const lastBlock = await this.getLastBlock();

    const index = lastBlock ? lastBlock.index + 1 : 0;
    const previousHash = lastBlock ? lastBlock.hash : "GENESIS";
    const timestamp = Date.now();

    const block = new Block(
      index,
      timestamp,
      userId,
      data,
      previousHash
    );

    await block.seal();
    await addDoc(this.collectionRef, { ...block });

    return block;
  }

  async verifyChain() {
    const q = query(this.collectionRef, orderBy("index", "asc"));
    const snapshot = await getDocs(q);

    let prevHash = "GENESIS";

    for (const docSnap of snapshot.docs) {
      const b = docSnap.data();

      const temp = new Block(
        b.index,
        b.timestamp,
        b.userId,
        b.data,
        b.previousHash
      );

      const recalculated = await temp.calculateHash();

      if (b.hash !== recalculated || b.previousHash !== prevHash) {
        return false;
      }
      prevHash = b.hash;
    }
    return true;
  }
}
