package dev.axeldoussoux.creneau.room;

import java.util.EnumSet;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "room")
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    private String location;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private int capacity;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "room_equipment", joinColumns = @JoinColumn(name = "room_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "equipment", nullable = false)
    private Set<Equipment> equipment = new HashSet<>();

    @Column(nullable = false)
    private boolean active = true;

    protected Room() {
    }

    public Room(String name, String location, String description, int capacity, Set<Equipment> equipment) {
        update(name, location, description, capacity, equipment);
    }

    public void update(String name, String location, String description, int capacity, Set<Equipment> equipment) {
        this.name = name.strip();
        this.location = location == null ? "" : location.strip();
        this.description = description == null ? "" : description.strip();
        this.capacity = capacity;
        this.equipment.clear();
        this.equipment.addAll(equipment);
    }

    public boolean hasAll(Set<Equipment> required) {
        return equipment.containsAll(required);
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getLocation() {
        return location;
    }

    public String getDescription() {
        return description;
    }

    public int getCapacity() {
        return capacity;
    }

    public Set<Equipment> getEquipment() {
        return equipment.isEmpty() ? EnumSet.noneOf(Equipment.class) : EnumSet.copyOf(equipment);
    }

    public boolean isActive() {
        return active;
    }
}
