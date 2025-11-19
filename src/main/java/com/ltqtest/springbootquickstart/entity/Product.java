package com.ltqtest.springbootquickstart.entity;

import lombok.Data;
import jakarta.persistence.*;
import jakarta.persistence.GenerationType;

@Data
@Entity
@Table(name = "product", schema = "public")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_id", nullable = false)
    private Integer productId;
    
    @Column(name = "product_name", nullable = false)
    private String productName;
    
    @Column(name = "price", nullable = false)
    private Float price;
    
    @Column(name = "producer", nullable = false)
    private String producer;
    
    @Column(name = "salesVolume", nullable = false)
    private Integer salesVolume = 0;
    
    @Column(name = "productImg", nullable = false)
    private String productImg;
    
    @Column(name = "surplus", nullable = false)
    private Integer surplus;
}