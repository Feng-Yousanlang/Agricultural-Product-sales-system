package com.ltqtest.springbootquickstart.entity;

import lombok.Data;
import jakarta.persistence.*;

@Data
@Entity
@Table(name = "agriculture_product")
public class AgricultureProduct {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "productId")
    private Integer productId;
    
    @Column(name = "productName", nullable = false)
    private String productName;
    
    @Column(name = "price", nullable = false)
    private Float price;
    
    @Column(name = "producerId")
    private Integer producerId;
    
    @Column(name = "salesVolume")
    private Integer salesVolume;
    
    @Column(name = "ecommerceLink")
    private String ecommerceLink;
    
    @Column(name = "productImg")
    private String productImg;
    
    // 关联供应商实体
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "producerId", referencedColumnName = "producerId", insertable = false, updatable = false)
    private AgricultureProducer producer;
    
    // 为了方便获取供应商名称
    public String getProducerName() {
        return producer != null ? producer.getProducerName() : "未知供应商";
    }
}