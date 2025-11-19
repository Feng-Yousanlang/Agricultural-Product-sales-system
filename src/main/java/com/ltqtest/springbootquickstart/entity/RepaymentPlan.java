package com.ltqtest.springbootquickstart.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import jakarta.persistence.*;
import java.util.Date;

/**
 * 还款计划实体类
 */
@Data
@Entity
@Table(name = "repayment_plan")
public class RepaymentPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "planId", nullable = false)
    private Integer planId;

    @Column(name = "applicationId", nullable = false)
    private Integer applicationId;

    // 已移除installmentNo字段

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Column(name = "due_date", nullable = false)
    private Date dueDate;

    @Column(name = "remainingAmount", nullable = false)
    private Float remainingAmount;

    @Column(name = "status", nullable = false, columnDefinition = "VARCHAR(10) DEFAULT '未还'")
    private String status;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "created_at", updatable = false)
    private Date createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "updated_at")
    private Date updatedAt;

    // 关联贷款申请
    @ManyToOne
    @JoinColumn(name = "applicationId", referencedColumnName = "applicationId", insertable = false, updatable = false)
    private LoanApplication loanApplication;

    @PrePersist
    protected void onCreate() {
        createdAt = new Date();
        updatedAt = new Date();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = new Date();
    }
}
