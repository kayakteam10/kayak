// Helper to convert PostgreSQL-style queries ($1, $2) to SQLite (?)
// This allows us to keep the same query syntax

const convertQuery = (sql, params) => {
  let convertedSql = sql;
  const convertedParams = [];
  
  // Convert $1, $2, etc. to ?
  let paramIndex = 1;
  convertedSql = sql.replace(/\$\d+/g, () => {
    convertedParams.push(params[paramIndex - 1]);
    paramIndex++;
    return '?';
  });
  
  return { sql: convertedSql, params: convertedParams };
};

module.exports = { convertQuery };

