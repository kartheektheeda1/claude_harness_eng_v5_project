package com.claimflow.architecture;

import com.claimflow.service.ClaimService;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Modifier;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

class ArchitectureRulesTest {
    // Official capstone architecture traces: AC-07 and AC-10.
    private final JavaClasses applicationClasses = new ClassFileImporter()
        .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
        .importPackages("com.claimflow");

    @Test
    void apiLayerCannotAccessRepositoriesDirectly() {
        noClasses().that().resideInAPackage("..api..")
            .should().dependOnClassesThat().resideInAPackage("..repository..")
            .check(applicationClasses);
    }

    @Test
    void domainLayerRemainsIndependentOfApplicationLayers() {
        noClasses().that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "..api..", "..service..", "..repository..", "..config..")
            .check(applicationClasses);
    }

    @Test
    void repositoriesAreInterfaces() {
        classes().that().resideInAPackage("..repository..")
            .should().beInterfaces()
            .check(applicationClasses);
    }

    @Test
    void applicationServiceOperationsDeclareTransactionBoundaries() {
        assertThat(Arrays.stream(ClaimService.class.getDeclaredMethods())
            .filter(method -> Modifier.isPublic(method.getModifiers())))
            .allMatch(method -> method.isAnnotationPresent(Transactional.class));
    }
}
