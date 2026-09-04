import { pool } from "./db";

async function testQuery() {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM products INNER JOIN brands ON products.brand_id = brands.brand_id",
    );
    console.log("Query result:", rows);
  } catch (error) {
    console.error("Query failed:", error);
  }
}

testQuery();
