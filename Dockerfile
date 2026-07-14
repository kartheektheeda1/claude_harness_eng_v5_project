FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src src
RUN mvn -B -DskipTests package
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S claimflow && adduser -S claimflow -G claimflow
USER claimflow
WORKDIR /app
COPY --from=build /app/target/claimflow-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
