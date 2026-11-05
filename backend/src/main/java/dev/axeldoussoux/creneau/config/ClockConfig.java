package dev.axeldoussoux.creneau.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class ClockConfig {

    /** Horloge injectée partout où l'on lit « maintenant », pour des tests déterministes. */
    @Bean
    Clock clock(AppProperties properties) {
        return Clock.system(properties.zone());
    }
}
