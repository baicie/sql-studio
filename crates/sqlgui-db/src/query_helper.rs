/// Check if the SQL is simple enough for auto-limit injection.
/// Only allows single-statement SELECTs without complex clauses or existing LIMIT.
pub fn can_auto_limit(sql: &str) -> bool {
    let trimmed = sql.trim().to_uppercase();
    if !trimmed.starts_with("SELECT") {
        return false;
    }
    // Don't auto-apply limit if user already specified one
    if trimmed.rsplit_once("LIMIT").is_some() {
        return false;
    }
    if trimmed.contains(';') {
        return false;
    }
    if trimmed.contains(" UNION ")
        || trimmed.contains(" UNION_ALL")
        || trimmed.contains(" INTERSECT ")
        || trimmed.contains(" EXCEPT ")
    {
        return false;
    }
    if trimmed.starts_with("WITH") {
        return false;
    }
    true
}

/// Apply LIMIT clause safely - only for simple SELECT statements.
/// Returns the original SQL unchanged if conditions are not met.
pub fn apply_limit(sql: &str, limit: u32) -> String {
    if can_auto_limit(sql) {
        format!("{} LIMIT {}", sql.trim(), limit)
    } else {
        sql.to_string()
    }
}

/// Apply LIMIT if needed, defaulting to 1000.
pub fn apply_limit_if_needed(sql: &str, limit: Option<u32>) -> String {
    apply_limit(sql, limit.unwrap_or(1000))
}

/// Determine if a SQL statement is a DML statement.
pub fn is_dml_statement(sql: &str) -> bool {
    let trimmed = sql.trim().to_uppercase();
    trimmed.starts_with("INSERT")
        || trimmed.starts_with("UPDATE")
        || trimmed.starts_with("DELETE")
        || trimmed.starts_with("REPLACE")
        || trimmed.starts_with("MERGE")
}
