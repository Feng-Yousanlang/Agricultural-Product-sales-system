package com.ltqtest.springbootquickstart.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.util.Date;

@Data
@Entity
@Table(name = "loan_application")
public class LoanApplication {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "applicationId")
    private Integer applicationId;
    
    @Column(name = "userId", nullable = false)
    private Integer userId;
    
    @Column(name = "productId", nullable = false)
    private Integer productId;
    
    @Column(name = "amount", nullable = false)
    private Integer amount;
    
    @Column(name = "term", nullable = false)
    private Integer term;
    
    @Column(name = "documents")
    private String documents; // 存储文件路径或文件信息
    
    @Column(name = "status", nullable = false)
    private Integer status; // 申请状态，对应loan_status表的status_code
    
    @Column(name = "applyTime", nullable = false)
    private Date applyTime;
    
    // 关联到金融产品
    @ManyToOne
    @JoinColumn(name = "productId", referencedColumnName = "fpId", insertable = false, updatable = false)
    private FinancialProduct financialProduct;
    
    // 关联到用户表，通过userId外键关联
    @ManyToOne
    @JoinColumn(name = "userId", referencedColumnName = "user_id", insertable = false, updatable = false)
    private User user;
    
    // 关联到贷款状态表，通过status字段（对应status_code）
    @ManyToOne
    @JoinColumn(name = "status", referencedColumnName = "status_code", insertable = false, updatable = false)
    private LoanStatus loanStatus;
}