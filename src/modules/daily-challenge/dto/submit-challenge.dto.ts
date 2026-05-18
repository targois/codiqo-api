import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitChallengeDto {
  @ApiProperty({
    description: 'User-submitted code. Normalized before comparison.',
    example: 'for n in range(1, 16):\n    if n % 15 == 0:\n        print("FizzBuzz")',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  code!: string;
}
