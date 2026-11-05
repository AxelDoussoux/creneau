package dev.axeldoussoux.creneau.auth;

import dev.axeldoussoux.creneau.auth.AuthDtos.AuthResponse;
import dev.axeldoussoux.creneau.auth.AuthDtos.LoginRequest;
import dev.axeldoussoux.creneau.auth.AuthDtos.RegisterRequest;
import dev.axeldoussoux.creneau.common.CurrentUser;
import dev.axeldoussoux.creneau.user.UserResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Authentification")
@RestController
@RequestMapping("/api")
class AuthController {

    private final AuthService auth;

    AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/auth/login")
    AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return auth.login(request);
    }

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return auth.register(request);
    }

    @GetMapping("/me")
    UserResponse me(Authentication authentication) {
        return auth.me(CurrentUser.of(authentication).id());
    }
}
