package com.ltqtest.springbootquickstart;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class SpringbootQuickstartApplication {

    public static void main(String[] args) {
        SpringApplication.run(SpringbootQuickstartApplication.class, args);
    }

}
