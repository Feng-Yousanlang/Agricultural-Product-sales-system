package com.ltqtest.springbootquickstart.entity;

import lombok.Data;
import jakarta.persistence.*;

@Data
@Entity
@Table(name = "experts")
public class Expert {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "expertId")
    private Integer expertId;

    @Column(name = "expertName", nullable = false)
    private String expertName;

    @Column(name = "field", nullable = false, columnDefinition = "TEXT")
    private String field;

    @Column(name = "expertDescription", nullable = false, columnDefinition = "TEXT")
    private String expertDescription;
    
    @Column(name = "expertImg", nullable = false)
    private String expertImg;
    
    @Column(name = "example", nullable = false, columnDefinition = "TEXT")
    private String example;
    
    @Column(name = "expertPhone", nullable = false)
    private String expertPhone;
    
    @Column(name = "expertEmail", nullable = false)
    private String expertEmail;

  
}
