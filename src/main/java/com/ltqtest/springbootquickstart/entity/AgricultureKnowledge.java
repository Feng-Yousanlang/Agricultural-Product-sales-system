package com.ltqtest.springbootquickstart.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.util.Date;

@Data
@Entity
@Table(name = "agriculture_knowledge")
public class AgricultureKnowledge {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false, updatable = false, insertable = false)
    private Integer id; // 唯一标识，主键自增

    @Column(name = "title", length = 255)
    private String title; // 文章标题

    @Column(name = "source", length = 255)
    private String source; // 文章来源

    @Column(name = "url", length = 255)
    private String url; // 原文链接

    @Column(name = "publish")
    private Date publish; // 文章发布日期
}
