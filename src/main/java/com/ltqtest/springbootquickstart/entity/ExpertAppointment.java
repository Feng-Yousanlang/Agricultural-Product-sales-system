package com.ltqtest.springbootquickstart.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "expert_appointment")
@EntityListeners(AuditingEntityListener.class)
public class ExpertAppointment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "expert_appointment_id")
    private Long appointmentId;
    
    @Column(name = "expert_id", nullable = false)
    private Integer expertId;
    
    @Column(name = "user_id", nullable = false)
    private Integer userId;
    
    @Column(name = "date", nullable = false)
    private LocalDate date;
    
    @Column(name = "time", nullable = false)
    private String time;
    
    @Column(name = "topic")
    private String topic;
    
    @Column(name = "remark", columnDefinition = "TEXT")
    private String remark;
    
    @Column(name = "status", nullable = false)
    private String status = "pending"; // 默认状态为待处理
    
    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment; // 审批备注
    
    @Column(name = "report", columnDefinition = "TEXT")
    private String report; // 咨询报告
    
    @CreatedDate
    @Column(name = "create_time", nullable = false)
    private LocalDateTime createTime;
    
    @LastModifiedDate
    @Column(name = "update_time", nullable = false)
    private LocalDateTime updateTime;
    
    // 关联专家
    @ManyToOne
    @JoinColumn(name = "expert_id", referencedColumnName = "expertId", insertable = false, updatable = false)
    private Expert expert;
    
    // 关联用户
    @ManyToOne
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", insertable = false, updatable = false)
    private User user;
}
