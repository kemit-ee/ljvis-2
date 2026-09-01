# The liquibase/liquibase image bundles the PostgreSQL JDBC driver at
# /liquibase/internal/lib/postgresql.jar (shipped since ~4.24), and
# `liquibase update` picks drivers up from there automatically. An explicit
# `lpm add postgresql` was therefore redundant — and its only effect was to
# add a network fetch to every image build, which flaked intermittently
# ("lpm add postgresql --global did not complete successfully").
FROM liquibase/liquibase:4.29.2
COPY DSL/Liquibase/ /liquibase/
