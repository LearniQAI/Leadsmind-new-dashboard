
import { IClient } from "@/interface";
import Image from "next/image";
import Link from "next/link";
import React from "react";

interface propsType {
  item: IClient;
}

const ClientSingleCard = ({ item }: propsType) => {
  return (
    <>
      <div
        key={item.id}
        className="col-span-12 md:col-span-6 xl:col-span-4 xxl:col-span-3"
      >
        <div className="card__wrapper">
          <div className="client__wrapper text-center">
            <div className="client__thumb mb-[15px] flex justify-center">
              <Link href={`/clients/client-details/${item.id}`}>
                <Image src={item.image} alt="image" />
              </Link>
            </div>
            <div className="client__content">
              <div className="client__meta">
                <h4 className="mb-2">
                  <Link href={`/clients/client-details/${item.id}`}>
                    {item.name}
                  </Link>
                </h4>
                <span>{item.company}</span>
                <p>{item.position}</p>
              </div>
              <div className="common-social mb-[20px]">
                <Link href={item.socialLinks.facebook} target="_blank">
                  <i className="fa-brands fa-facebook-f"></i>
                </Link>
                <Link href={item.socialLinks.twitter} target="_blank">
                  <i className="fa-brands fa-x-twitter"></i>
                </Link>
                <Link href={item.socialLinks.linkedin} target="_blank">
                  <i className="fa-brands fa-linkedin-in"></i>
                </Link>
                <Link href={item.socialLinks.youtube} target="_blank">
                  <i className="fa-brands fa-youtube"></i>
                </Link>
                <Link href={item.socialLinks.website} target="_blank">
                  <i className="fa-thin fa-globe"></i>
                </Link>
              </div>
              <div className="client__btn">
                <div className="flex items-center justify-center gap-[15px]">
                  <Link
                    className="btn btn-outline-primary"
                    href={`tel:${item.phone}`}
                  >
                    Call
                  </Link>
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    data-bs-toggle="modal"
                    data-bs-target="#editClient"
                  >
                    Edit
                  </button>
                  <Link
                    className="btn btn-outline-primary"
                    href={`/clients/client-details/${item.id}`}
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientSingleCard;
