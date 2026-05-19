package com.streamforge.domain;

public record ValidationResult(
    boolean isValid,
    int errorPosition,
    String errorMessage
) {
    // factory methods for clean construction
    public static ValidationResult valid() {
        return new ValidationResult(true, -1, null);
    }

    public static ValidationResult invalid(int position, String message) {
        return new ValidationResult(false, position, message);
    }
}