package dev.axeldoussoux.creneau.auth;

import java.time.Clock;

import dev.axeldoussoux.creneau.auth.AuthDtos.AuthResponse;
import dev.axeldoussoux.creneau.auth.AuthDtos.LoginRequest;
import dev.axeldoussoux.creneau.auth.AuthDtos.RegisterRequest;
import dev.axeldoussoux.creneau.common.ApiException;
import dev.axeldoussoux.creneau.user.AppUser;
import dev.axeldoussoux.creneau.user.Role;
import dev.axeldoussoux.creneau.user.UserRepository;
import dev.axeldoussoux.creneau.user.UserResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokens;
    private final Clock clock;

    AuthService(UserRepository users, PasswordEncoder passwordEncoder, TokenService tokens, Clock clock) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.tokens = tokens;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    AuthResponse login(LoginRequest request) {
        AppUser user = users.findByEmail(AppUser.normalizeEmail(request.email()))
                .filter(candidate -> passwordEncoder.matches(request.password(), candidate.getPasswordHash()))
                .orElseThrow(() -> new BadCredentialsException("bad credentials"));
        return respond(user);
    }

    @Transactional
    AuthResponse register(RegisterRequest request) {
        String email = AppUser.normalizeEmail(request.email());
        if (users.existsByEmail(email)) {
            throw ApiException.conflict("EMAIL_TAKEN", "Un compte existe déjà avec cet email.");
        }
        AppUser user = users.save(new AppUser(email, request.fullName(),
                passwordEncoder.encode(request.password()), Role.USER, clock.instant()));
        return respond(user);
    }

    @Transactional(readOnly = true)
    UserResponse me(long userId) {
        return users.findById(userId)
                .map(UserResponse::of)
                .orElseThrow(() -> ApiException.notFound("Utilisateur introuvable."));
    }

    private AuthResponse respond(AppUser user) {
        TokenService.IssuedToken token = tokens.issue(user);
        return new AuthResponse(token.value(), token.expiresAt(), UserResponse.of(user));
    }
}
