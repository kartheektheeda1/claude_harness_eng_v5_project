package com.claimflow.api;

import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String,Object>> validation(MethodArgumentNotValidException ex) {
        Map<String,String> fields = new LinkedHashMap<>(); ex.getBindingResult().getFieldErrors().forEach(e -> fields.put(e.getField(), e.getDefaultMessage()));
        return ResponseEntity.badRequest().body(Map.of("timestamp", Instant.now(), "error", "Validation failed", "fields", fields));
    }
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String,Object>> status(ResponseStatusException ex) { return ResponseEntity.status(ex.getStatusCode()).body(Map.of("timestamp", Instant.now(), "error", ex.getReason() == null ? "Request failed" : ex.getReason())); }
    @ExceptionHandler(IllegalStateException.class)
    ResponseEntity<Map<String,Object>> state(IllegalStateException ex) { return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("timestamp", Instant.now(), "error", ex.getMessage())); }
}
