package com.ltqtest.springbootquickstart.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "tb_user")
@EntityListeners(AuditingEntityListener.class)
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id", nullable = false, updatable = false, insertable = false)
    private Long userId;
    
    @Column(name = "username", length = 50, nullable = false)
    private String username;
    
    @Column(name = "password", length = 100, nullable = false)
    private String password;
    
    @Column(name = "real_name", length = 50)
    private String realName;
    
    @Column(name = "role_type", nullable = false, columnDefinition = "TINYINT default 1")
    private Integer roleType = 1; // 1-农户，2-买家，3-专家，4-银行工作人员，5-平台管理员
    
    @Column(name = "phone", length = 20)
    private String phone;
    
    @Column(name = "email", length = 100)
    private String email;
    
    @Column(name = "id_card", length = 18)
    private String idCard;
    
    @Column(name = "status", columnDefinition = "TINYINT default 1")
    private Integer status = 1; // 1-正常，0-禁用
    
    @Column(name = "login_status", columnDefinition = "TINYINT default 0")
    private Integer loginStatus = 0; // 0-未登录，1-已登录
    
    @CreatedDate
    @Column(name = "create_time")
    private LocalDateTime createTime;
    
    @LastModifiedDate
    @Column(name = "update_time")
    private LocalDateTime updateTime;
    
    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "approver_id")
    private Integer approverId;

    @Column(name = "expert_id")
    private Integer expertId;
}
