package dev.axeldoussoux.creneau;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class CreneauApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(CreneauApiApplication.class, args);
    }
}
