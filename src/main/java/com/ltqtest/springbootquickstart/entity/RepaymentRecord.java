package com.ltqtest.springbootquickstart.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.Data;

import java.util.Date;

@Entity
@Table(name = "repayment_record")
@Data
public class RepaymentRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "recordId")
    private Integer recordId;

    @Column(name = "applicationId", nullable = false)
    private Integer applicationId;

    @Column(name = "userId", nullable = false)
    private Integer userId;

    @Column(name = "amount", nullable = false)
    private Float amount;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Column(name = "pay_date", nullable = false)
    private Date payDate;

    @Column(name = "status", nullable = false, columnDefinition = "VARCHAR(10) DEFAULT '已还'")
    private String status = "已还";

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "created_at", updatable = false)
    private Date createdAt;

    @ManyToOne
    @JoinColumn(name = "applicationId", insertable = false, updatable = false)
    private LoanApplication loanApplication;

    @PrePersist
    protected void onCreate() {
        createdAt = new Date();
    }
}
