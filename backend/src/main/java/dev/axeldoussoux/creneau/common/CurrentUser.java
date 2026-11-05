package dev.axeldoussoux.creneau.common;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;

/** Identité de l'appelant, extraite du jeton JWT (sujet = identifiant utilisateur). */
public record CurrentUser(long id, boolean admin) {

    public static CurrentUser of(Authentication authentication) {
        boolean admin = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);
        return new CurrentUser(Long.parseLong(authentication.getName()), admin);
    }
}
