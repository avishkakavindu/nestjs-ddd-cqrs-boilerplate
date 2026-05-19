export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  createdAt: Date;

  constructor(partial: UserResponseDto) {
    Object.assign(this, partial);
  }
}
