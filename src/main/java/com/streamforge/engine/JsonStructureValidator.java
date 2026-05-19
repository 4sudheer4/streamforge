package com.streamforge.engine;

import com.streamforge.domain.ValidationResult;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;

@Component
public class JsonStructureValidator {

    public ValidationResult validate(String json) {
        Deque<Character> deque = new ArrayDeque<>();

        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);

            // push open brackets
            if (c == '{' || c == '[' || c == '(') {
                deque.addLast(c);
            }

            // validate close brackets
            else if (c == '}' || c == ']' || c == ')') {

                // error case 1 — close bracket with nothing open
                if (deque.isEmpty()) {
                    return ValidationResult.invalid(i,
                        String.format("Unexpected '%c' at position %d — no matching open bracket", c, i));
                }

                char open = deque.removeLast();

                // error case 2 — mismatched bracket types
                if (c == '}' && open != '{') {
                    return ValidationResult.invalid(i,
                        String.format("Expected '}' to close '%c' but found '%c' at position %d", open, c, i));
                }
                if (c == ']' && open != '[') {
                    return ValidationResult.invalid(i,
                        String.format("Expected ']' to close '%c' but found '%c' at position %d", open, c, i));
                }
                if (c == ')' && open != '(') {
                    return ValidationResult.invalid(i,
                        String.format("Expected ')' to close '%c' but found '%c' at position %d", open, c, i));
                }
            }
        }

        // error case 3 — unclosed brackets at end
        if (!deque.isEmpty()) {
            return ValidationResult.invalid(json.length(),
                String.format("Unclosed bracket '%c' — missing closing bracket", deque.peekLast()));
        }

        return ValidationResult.valid();
    }
}