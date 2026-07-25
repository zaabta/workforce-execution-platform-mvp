/** Authenticated actor attached to a request by JwtStrategy. */
export interface Actor {
  userId: string;
  email: string;
}
