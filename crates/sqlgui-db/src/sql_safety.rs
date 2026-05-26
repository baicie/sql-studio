pub fn is_readonly_sql(sql: &str) -> bool {
    let normalized = strip_comments(sql).trim().to_lowercase();

    let first = normalized
        .split_whitespace()
        .next()
        .unwrap_or("");

    matches!(
        first,
        "select" | "show" | "describe" | "desc" | "explain" | "with" | "pragma"
    )
}

fn strip_comments(sql: &str) -> String {
    let mut result = String::new();

    for line in sql.lines() {
        if let Some(index) = line.find("--") {
            result.push_str(&line[..index]);
        } else {
            result.push_str(line);
        }

        result.push('\n');
    }

    result
}
