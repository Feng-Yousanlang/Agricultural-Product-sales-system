package com.ltqtest.springbootquickstart.entity;

import jakarta.persistence.*;
import lombok.Data;

/**
 * 新闻实体类
 */
@Data
@Entity
@Table(name = "tb_news")
public class News {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "newsId")
    private Integer newsId;
    
    @Column(name = "title")
    private String title;
    
    @Column(name = "imgUrl")
    private String imgUrl;
    
    @Column(name = "newsUrl")
    private String newsUrl;
}