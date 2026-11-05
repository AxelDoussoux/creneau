package dev.axeldoussoux.creneau.common;

import org.springframework.http.HttpStatus;

/**
 * Erreur métier attendue, traduite en ProblemDetail (RFC 9457) par {@link ApiExceptionHandler}.
 * Le code est stable et lisible par le front, le message est destiné à l'utilisateur.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", message);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
    }

    public static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }

    /** Requête bien formée mais refusée par une règle métier. */
    public static ApiException rule(String code, String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, code, message);
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }
}
