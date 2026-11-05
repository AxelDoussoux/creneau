package dev.axeldoussoux.creneau;

import org.springframework.boot.SpringApplication;

public class TestCreneauApiApplication {

	public static void main(String[] args) {
		SpringApplication.from(CreneauApiApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
