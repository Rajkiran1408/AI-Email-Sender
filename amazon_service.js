const axios = require("axios");

/**
 * Search Amazon products by keyword using RapidAPI
 * Returns top 5 products with ASIN and title
 */
async function searchAmazonProducts(keyword) {
  if (!keyword || keyword.trim().length === 0) {
    return { ok: false, error: "Keyword is required" };
  }

  const searchUrl = "https://realtime-amazon-data.p.rapidapi.com/search";
  const detailsUrl = "https://realtime-amazon-data.p.rapidapi.com/product-details";

  try {
    // Step 1: Search for products
    const searchRes = await axios.get(searchUrl, {
      params: { query: keyword, page: "1", country: "US" },
      headers: {
        "x-rapidapi-key": process.env.RAPIDAPI_KEY,
        "x-rapidapi-host": "realtime-amazon-data.p.rapidapi.com",
      },
    });

    const products = searchRes.data?.data?.products || [];
    if (!products.length) return { ok: false, error: "No products found" };

    // Step 2: Fetch product details for top 5 products
    const topProducts = products.slice(0, 5);
    const detailedProducts = [];

    for (const p of topProducts) {
      if (!p.asin) continue;
      const detailRes = await axios.get(detailsUrl, {
        params: { asin: p.asin, country: "US" },
        headers: {
          "x-rapidapi-key": process.env.RAPIDAPI_KEY,
          "x-rapidapi-host": "realtime-amazon-data.p.rapidapi.com",
        },
      });
      detailedProducts.push(detailRes.data);
    }

    return { ok: true, products: detailedProducts };
  } catch (err) {
    return { ok: false, error: err.response?.data || err.message };
  }
}

module.exports = { searchAmazonProducts };
