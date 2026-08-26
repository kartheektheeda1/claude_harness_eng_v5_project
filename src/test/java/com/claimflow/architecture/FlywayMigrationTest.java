package com.claimflow.architecture;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class FlywayMigrationTest {
    @Autowired Flyway flyway;
    @Autowired JdbcTemplate jdbc;

    @Test
    @DisplayName("NFR-05: Flyway builds the complete append-only evidence schema")
    void acE2S2Ac4AppliesEverySchemaMigrationFromAnEmptyDatabase() {
        assertThat(flyway.info().applied()).hasSize(4);
        assertThat(tableExists("CLAIMS")).isEqualTo(1);
        assertThat(tableExists("AUDIT_EVENTS")).isEqualTo(1);
        assertThat(tableExists("SETTLEMENTS")).isEqualTo(1);
        assertThat(tableExists("DOCUMENT_VERIFICATION_RECORDS")).isEqualTo(1);
        assertThat(tableExists("FRAUD_SCREENING_RECORDS")).isEqualTo(1);
        assertThat(tableExists("ASSESSMENT_RECORDS")).isEqualTo(1);
        assertThat(tableExists("DECISION_RECORDS")).isEqualTo(1);
        assertThat(tableExists("CLAIM_TRANSITION_RECORDS")).isEqualTo(1);
    }

    private Integer tableExists(String tableName) {
        return jdbc.queryForObject(
            "select count(*) from information_schema.tables where table_name = ?",
            Integer.class,
            tableName
        );
    }
}
