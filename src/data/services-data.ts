import { StaticImageData } from "next/image";
import serviceImg1 from "../../public/assets/img/service/service-img-st2-1.jpg";
import serviceImg2 from "../../public/assets/img/service/service-img-st2-2.jpg";
import serviceImg3 from "../../public/assets/img/service/service-img-st2-3.jpg";
import serviceImg4 from "../../public/assets/img/service/service-img-st2-4.jpg";

//home theree service image 
import serviceImg5 from "../../public/assets/img/service/service-3-img1.jpg";
import serviceImg6 from "../../public/assets/img/service/service-3-img2.jpg";
import serviceImg7 from "../../public/assets/img/service/service-3-img3.jpg";

//service icon
import iconImg from "../../public/assets/img/icon/s-icon1.png"; 
import iconImg2 from "../../public/assets/img/icon/s-icon2.png";
import iconImg3 from "../../public/assets/img/icon/s-icon3.png";
import iconImg4 from "../../public/assets/img/icon/feature-product-icon-1.png";
import iconImg5 from "../../public/assets/img/icon/feature-product-icon-2.png";
import iconImg6 from "../../public/assets/img/icon/feature-product-icon-3.png";
import iconImg7 from "../../public/assets/img/icon/feature-product-icon-4.png";
import iconImg8 from "../../public/assets/img/icon/s-icon4.png"; 
import iconImg9 from "../../public/assets/img/icon/s-icon5.png";
import iconImg10 from "../../public/assets/img/icon/s-icon6.png";


interface TServiceData{
    id:number;
    serviceImg?:StaticImageData;
    serviceIcon?:string;
    serviceIconImg?:StaticImageData;
    serviceTitle:string,
    serviceBadge:string
    serviceDesc:string,
    serviceBtn?:string
}

const ServicesList:TServiceData[] = [
    {
        id:1,
        serviceImg:serviceImg1,
        serviceIcon:'flaticon-gardening-1',
        serviceTitle:'landscaping',
        serviceBadge:'',
        serviceDesc:'Get expert advice on how to design a garden.',

    },
    {
        id:2,
        serviceImg:serviceImg2,
        serviceIcon:'flaticon-house',
        serviceTitle:'Urban',
        serviceBadge:'',
        serviceDesc:'Plants are expensive and need to be looked after.',

    },
    {
        id:3,
        serviceImg:serviceImg3,
        serviceIcon:'flaticon-farming-and-gardening',
        serviceTitle:'Maintenance',
        serviceBadge:'',
        serviceDesc:'Keep your green garden low maintenance.',

    },
    {
        id:4,
        serviceImg:serviceImg4,
        serviceIcon:'flaticon-flower-with-rounded-petals',
        serviceTitle:'Events',
        serviceBadge:'',
        serviceDesc:'We at The Gardeny are proud to offer',
    },
    //home one service end
    {
        id:5,
        serviceImg:serviceImg1,
        serviceIconImg:iconImg,
        serviceTitle:'Garden landscaping',
        serviceBadge:'',
        serviceDesc:'The laying out and care of a plot of ground devoted partially or wholly.',
        serviceBtn:'read more',
    },
    {
        id:6,
        serviceImg:serviceImg2,
        serviceIconImg:iconImg2,
        serviceTitle:'soil making & carbo',
        serviceBadge:'',
        serviceDesc:'The laying out and care of a plot of ground devoted partially or wholly.',
        serviceBtn:'read more',
    },
    {
        id:7,
        serviceImg:serviceImg3,
        serviceIconImg:iconImg3,
        serviceTitle:'planting plants',
        serviceBadge:'',
        serviceDesc:'The laying out and care of a plot of ground devoted partially or wholly.',
        serviceBtn:'read more',
    },
    //home two service end
    {
        id:8,
        serviceImg:serviceImg5,
        serviceIcon:'flaticon-farmer',
        serviceTitle:'Garden landscaping',
        serviceBadge:'',
        serviceDesc:'The laying out and care of a plot of ground devoted partially or wholly.',
        serviceBtn:'read more',
    },
    {
        id:9,
        serviceImg:serviceImg6,
        serviceIcon:'flaticon-gardening',
        serviceTitle:'commercial planting',
        serviceBadge:'',
        serviceDesc:'The laying out and care of a plot of ground devoted partially or wholly.',
        serviceBtn:'read more',
    },
    {
        id:10,
        serviceImg:serviceImg7,
        serviceIcon:'flaticon-farming-and-gardening',
        serviceTitle:'soil making & solutions',
        serviceBadge:'',
        serviceDesc:'The laying out and care of a plot of ground devoted partially or wholly.',
        serviceBtn:'read more',
    },
    //home three service end
    {
        id:11,
        serviceIconImg:iconImg,
        serviceTitle:'Garden landscaping',
        serviceBadge:'',
        serviceDesc:'The laying out and care of a plot of ground devoted partially or wholly.',
        serviceBtn:'read more',
    },
    {
        id:12,
        serviceIconImg:iconImg2,
        serviceTitle:'soil making & carbo',
        serviceBadge:'',
        serviceDesc:'The laying out and care of a plot of ground devoted partially or wholly.',
        serviceBtn:'read more',
    },
    {
        id:13,
        serviceIconImg:iconImg3,
        serviceTitle:'planting plants',
        serviceBadge:'',
        serviceDesc:'The laying out and care of a plot of ground devoted partially or wholly.',
        serviceBtn:'read more',
    },
    //home four service end
    {
        id:14,
        serviceIconImg:iconImg4,
        serviceTitle:'ORDER ONLINE',
        serviceBadge:'',
        serviceDesc:'Content is information produce directed at an end-user',
        serviceBtn:'',
    },
    {
        id:15,
        serviceIconImg:iconImg5,
        serviceTitle:'FAST PAYMENT',
        serviceBadge:'',
        serviceDesc:'Content is information produce directed at an end-user',
        serviceBtn:'',
    },
    {
        id:16,
        serviceIconImg:iconImg6,
        serviceTitle:'quick DELIVERY',
        serviceBadge:'',
        serviceDesc:'Content is information produce directed at an end-user',
        serviceBtn:'',
    },
    {
        id:17,
        serviceIconImg:iconImg7,
        serviceTitle:'global SHIPPINg',
        serviceBadge:'',
        serviceDesc:'Content is information produce directed at an end-user',
        serviceBtn:'',
    },
    //home five service end
    {
        id:18,
        serviceIconImg:iconImg,
        serviceTitle:'Garden landscaping',
        serviceBadge:'',
        serviceDesc:'The laying out and care of a plot of ground devoted partially or wholly.',
        serviceBtn:'read more',
    },
    {
        id:19,
        serviceIconImg:iconImg2,
        serviceTitle:'soil making & carbo',
        serviceBadge:'',
        serviceDesc:'The laying out and care of a plot of ground devoted partially or wholly.',
        serviceBtn:'read more',
    },
    {
        id:20,
        serviceIconImg:iconImg3,
        serviceTitle:'planting plants',
        serviceBadge:'',
        serviceDesc:'The laying out and care of a plot of ground devoted partially or wholly.',
        serviceBtn:'read more',
    },
    {
        id:21,
        serviceIconImg:iconImg8,
        serviceTitle:'new plant seeds',
        serviceBadge:'',
        serviceDesc:'The laying out and care of a plot of ground devoted partially or wholly.',
        serviceBtn:'read more',
    },
    {
        id:22,
        serviceIconImg:iconImg9,
        serviceTitle:'butterfly solution',
        serviceBadge:'',
        serviceDesc:'The laying out and care of a plot of ground devoted partially or wholly.',
        serviceBtn:'read more',
    },
    {
        id:23,
        serviceIconImg:iconImg10,
        serviceTitle:'garden take care',
        serviceBadge:'',
        serviceDesc:'The laying out and care of a plot of ground devoted partially or wholly.',
        serviceBtn:'read more',
    }
    //service page end
  ]
  
  export default ServicesList;