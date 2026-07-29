import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const getServerHttp = async () => {
  return axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
      "Content-Type": "application/json",
    },
  })
}

export const getServerHttpNoCookie = async () => {
  return axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
      "Content-Type": "application/json",
    },
  })
}
