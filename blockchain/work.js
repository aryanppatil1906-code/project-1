import { Blockchain } from "./blockchain/chain.js";

const chain = new Blockchain();

// Example: ANY DATA
const data = {
  energy: 120.5,
  price: 6.2,
  source: "solar",
  metadata: { location: "Pune" }
};

(async () => {
  const block = await chain.addBlock("user_123", data);
  console.log("Block added:", block);

  const isValid = await chain.verifyChain();
  console.log("Blockchain valid:", isValid);
})();
