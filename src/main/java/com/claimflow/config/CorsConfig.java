package com.claimflow.config;
import org.springframework.context.annotation.*;
import org.springframework.web.cors.*;
import java.util.List;
@Configuration
public class CorsConfig {
    @Bean CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration c = new CorsConfiguration(); c.setAllowedOrigins(List.of("http://localhost:5173")); c.setAllowedMethods(List.of("GET","POST","PATCH","OPTIONS")); c.setAllowedHeaders(List.of("*")); c.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/api/**", c); return source;
    }
}
