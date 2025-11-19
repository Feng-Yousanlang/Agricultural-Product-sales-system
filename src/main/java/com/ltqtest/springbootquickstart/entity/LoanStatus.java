package com.ltqtest.springbootquickstart.entity;
import lombok.Data;
import jakarta.persistence.*;
import java.util.Date;

@Data
@Entity
@Table(name = "loan_status")

public class LoanStatus {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "status_id")
    private Integer statusId;
    
    @Column(name = "status_code", nullable = false, unique = true)
    private Integer statusCode;
    
    @Column(name = "status_name", nullable = false, length = 50)
    private String statusName;
    
    @Column(name = "description", length = 255)
    private String description;
    
    @Column(name = "create_time", updatable = false)
    private Date createTime;
    
    @PrePersist
    protected void onCreate() {
        createTime = new Date();
    }
}
