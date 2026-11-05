package dev.axeldoussoux.creneau.auth;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import dev.axeldoussoux.creneau.config.AppProperties;
import dev.axeldoussoux.creneau.user.AppUser;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
class TokenService {

    private final JwtEncoder encoder;
    private final AppProperties.Jwt settings;
    private final Clock clock;

    TokenService(JwtEncoder encoder, AppProperties properties, Clock clock) {
        this.encoder = encoder;
        this.settings = properties.jwt();
        this.clock = clock;
    }

    record IssuedToken(String value, Instant expiresAt) {
    }

    IssuedToken issue(AppUser user) {
        Instant now = clock.instant();
        Instant expiresAt = now.plus(settings.ttl());
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(settings.issuer())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .subject(String.valueOf(user.getId()))
                .claim("name", user.getFullName())
                .claim("roles", List.of(user.getRole().name()))
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new IssuedToken(token, expiresAt);
    }
}
