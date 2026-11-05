package dev.axeldoussoux.creneau.room;

import java.util.List;

import dev.axeldoussoux.creneau.room.RoomDtos.ActiveRequest;
import dev.axeldoussoux.creneau.room.RoomDtos.RoomRequest;
import dev.axeldoussoux.creneau.room.RoomDtos.RoomResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Administration")
@RestController
@RequestMapping("/api/admin/rooms")
class AdminRoomController {

    private final RoomService rooms;

    AdminRoomController(RoomService rooms) {
        this.rooms = rooms;
    }

    @GetMapping
    List<RoomResponse> list() {
        return rooms.listAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    RoomResponse create(@Valid @RequestBody RoomRequest request) {
        return rooms.create(request);
    }

    @PutMapping("/{id}")
    RoomResponse update(@PathVariable long id, @Valid @RequestBody RoomRequest request) {
        return rooms.update(id, request);
    }

    @PatchMapping("/{id}/active")
    RoomResponse setActive(@PathVariable long id, @RequestBody ActiveRequest request) {
        return rooms.setActive(id, request.active());
    }
}
