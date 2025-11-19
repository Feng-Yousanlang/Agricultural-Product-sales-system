package com.ltqtest.springbootquickstart.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "approver")
public class Approver {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "approverId")
    private Integer approverId;
    
    @Column(name = "approverName", nullable = false)
    private String approverName;
    
    @Column(name = "approverPhone")
    private String approverPhone;
    
    @Column(name = "approverEmail")
    private String approverEmail;
}
