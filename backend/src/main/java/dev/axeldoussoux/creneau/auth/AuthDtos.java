package dev.axeldoussoux.creneau.auth;

import java.time.Instant;

import dev.axeldoussoux.creneau.user.UserResponse;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

final class AuthDtos {

    private AuthDtos() {
    }

    record LoginRequest(
            @NotBlank(message = "L'email est requis.") @Email(message = "Email invalide.") String email,
            @NotBlank(message = "Le mot de passe est requis.") String password) {
    }

    record RegisterRequest(
            @NotBlank(message = "L'email est requis.") @Email(message = "Email invalide.") @Size(max = 254) String email,
            @NotBlank(message = "Le nom est requis.") @Size(max = 80, message = "80 caractères maximum.") String fullName,
            @Size(min = 8, max = 72, message = "Entre 8 et 72 caractères.") String password) {
    }

    record AuthResponse(String token, Instant expiresAt, UserResponse user) {
    }
}
