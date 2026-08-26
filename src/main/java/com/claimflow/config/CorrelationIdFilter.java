package com.claimflow.config;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

@Component
public class CorrelationIdFilter extends OncePerRequestFilter {
    public static final String HEADER = "X-Correlation-ID";
    private static final Pattern SAFE = Pattern.compile("[A-Za-z0-9._-]{1,64}");
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String supplied = request.getHeader(HEADER);
        String correlationId = supplied != null && SAFE.matcher(supplied).matches() ? supplied : UUID.randomUUID().toString();
        response.setHeader(HEADER, correlationId);
        MDC.put("correlationId", correlationId);
        try { chain.doFilter(request, response); }
        finally { MDC.remove("correlationId"); }
    }
}
