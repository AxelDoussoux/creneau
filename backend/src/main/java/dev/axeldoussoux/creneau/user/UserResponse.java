package dev.axeldoussoux.creneau.user;

public record UserResponse(long id, String email, String fullName, Role role) {

    public static UserResponse of(AppUser user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getFullName(), user.getRole());
    }
}
