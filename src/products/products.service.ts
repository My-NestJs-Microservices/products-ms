import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaClient } from '@prisma/client';
import { PaginationDto } from 'src/common';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {

	private readonly logger = new Logger('ProductsService');

	onModuleInit() {
		this.$connect();
		this.logger.log('Connected to the database');
	}

	create(createProductDto: CreateProductDto) {
		return this.product.create({
			data: createProductDto
		})
	}

	async findAll(paginationDto: PaginationDto) {
		const { page, limit } = paginationDto;

		const totalProducts = await this.product.count({ where: { isAvailable: true } });
		const lastPage = Math.ceil(totalProducts / limit);

		return {
			data: await this.product.findMany({
				skip: (page - 1) * limit,
				take: limit,
				where: {
					isAvailable: true
				}
			}),
			meta: {
				page: page,
				total: totalProducts,
				lastPage: lastPage,
			}
		}
	}

	async findOne(id: number) {
		const product = await this.product.findUnique({
			where: { id, isAvailable: true }
		})

		if (!product) throw new RpcException({
			message: `Product with id #${id} not found`,
			statusCode: HttpStatus.NOT_FOUND
		});

		return product;
	}

	async update(id: number, updateProductDto: UpdateProductDto) {

		const { id: __, ...res } = updateProductDto;

		await this.findOne(id);

		return this.product.update({
			where: { id },
			data: res
		})
	}

	async remove(id: number) {
		await this.findOne(id);

		// return this.product.delete({
		// 	where: { id }
		// })

		return await this.product.update({
			where: { id },
			data: {
				isAvailable: false
			}
		})
	}


	async validateProducts(ids: number[]) {

		ids = Array.from(new Set(ids));

		const products = await this.product.findMany({
			where: {
				id: {
					in: ids
				}
			}
		});

		if (products.length !== ids.length) {
			throw new RpcException({
				message: 'Some products were not found',
				statusCode: HttpStatus.BAD_REQUEST
			});
		}


		return products;
	}
}
