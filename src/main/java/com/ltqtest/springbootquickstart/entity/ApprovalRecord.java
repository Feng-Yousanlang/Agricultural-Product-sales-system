package com.ltqtest.springbootquickstart.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.util.Date;

@Data
@Entity
@Table(name = "approval_record")
public class ApprovalRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "recordId")
    private Integer recordId;
    
    @Column(name = "applicationId", nullable = false)
    private Integer applicationId;
    
    @Column(name = "approverId", nullable = false)
    private Integer approverId;
    
    @Column(name = "decision", nullable = false)
    private Boolean decision;
    
    @Column(name = "opinion", nullable = false, length = 500)
    private String opinion;
    
    @Column(name = "approvalTime", nullable = false)
    private Date approvalTime;
    
    // 关联到贷款申请
    @ManyToOne
    @JoinColumn(name = "applicationId", referencedColumnName = "applicationId", insertable = false, updatable = false)
    private LoanApplication loanApplication;
    
    // 关联到审批人
    @ManyToOne
    @JoinColumn(name = "approverId", referencedColumnName = "approverId", insertable = false, updatable = false)
    private Approver approver;
}