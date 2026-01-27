package main

import (
	"context"
	"fmt"
	"log"
	"math/big"
	"os"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/joho/godotenv"
	"github.com/otimlabs/otim-go-sdk/client"
	"github.com/otimlabs/otim-go-sdk/signer"
)

const (
	// Chain IDs
	ethereumMainnetChainID = 1    // Ethereum mainnet
	baseChainID            = 8453 // Base

	// Token addresses
	pyUSDAddress = "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8" // pyUSD on Ethereum mainnet
	usdcAddress  = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" // USDC on Base
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	ctx := context.Background()

	if err := createSettlement(ctx); err != nil {
		log.Fatalf("Failed to create settlement: %v", err)
	}
}

func createSettlement(ctx context.Context) error {
	// Load configuration from environment variables
	apiURL := os.Getenv("OTIM_API_URL")
	apiKey := os.Getenv("OTIM_API_KEY")
	privateKey := os.Getenv("OTIM_PRIVATE_KEY")
	recipientAddress := os.Getenv("RECIPIENT_ADDRESS")

	if apiURL == "" {
		return fmt.Errorf("OTIM_API_URL environment variable is required")
	}
	if apiKey == "" {
		return fmt.Errorf("OTIM_API_KEY environment variable is required")
	}
	if privateKey == "" {
		return fmt.Errorf("OTIM_PRIVATE_KEY environment variable is required")
	}
	if recipientAddress == "" {
		return fmt.Errorf("RECIPIENT_ADDRESS environment variable is required")
	}

	// Initialize EthSigner with Turnkey
	log.Println("Initializing EthSigner...")
	ethSigner, err := signer.NewEthSigner(privateKey)
	if err != nil {
		return fmt.Errorf("failed to create EthSigner: %w", err)
	}

	// Create Client
	log.Println("Creating Otim client...")
	otimClient, err := client.NewClient(ethSigner, apiURL, apiKey)
	if err != nil {
		return fmt.Errorf("failed to create client: %w", err)
	}

	// Prepare settlement amount (1 USDC = 1000000 with 6 decimals)
	settlementAmount := new(big.Int)
	settlementAmount.SetString("1000000", 10) // 1 USDC

	// Build settlement orchestration request
	log.Println("Building settlement orchestration request...")
	buildRequest := &client.BuildSettlementOrchestrationRequest{
		AcceptedTokens: map[client.ChainID][]common.Address{
			ethereumMainnetChainID: {
				common.HexToAddress(pyUSDAddress), // Accept pyUSD on Ethereum mainnet
			},
			baseChainID: {
				common.HexToAddress(usdcAddress), // Accept USDC on Base
			},
		},
		SettlementChain:  baseChainID,
		SettlementToken:  common.HexToAddress(usdcAddress), // Settle to USDC on Base
		SettlementAmount: hexutil.Big(*settlementAmount),
		RecipientAddress: common.HexToAddress(recipientAddress),
	}

	// Call BuildSettlementOrchestration API
	log.Println("Calling BuildSettlementOrchestration API...")
	buildResponse, err := otimClient.BuildSettlementOrchestration(ctx, buildRequest)
	if err != nil {
		return fmt.Errorf("BuildSettlementOrchestration failed: %w", err)
	}

	log.Printf("Build Response - RequestID: %s", buildResponse.RequestID)
	log.Printf("Build Response - Ephemeral Wallet: %s", buildResponse.EphemeralWalletAddress.Hex())

	// Sign the orchestration (EIP-7702 authorization + EIP-712 instructions)
	log.Println("Signing orchestration with Turnkey...")
	newRequest, err := otimClient.NewOrchestrationFromBuild(ctx, buildResponse)
	if err != nil {
		return fmt.Errorf("NewOrchestrationFromBuild failed: %w", err)
	}

	log.Printf("Signed %d instructions successfully", len(newRequest.Instructions)+len(newRequest.CompletionInstructions))

	// Submit the signed orchestration
	log.Println("Submitting signed orchestration...")
	err = otimClient.NewOrchestration(ctx, newRequest)
	if err != nil {
		return fmt.Errorf("NewOrchestration failed: %w", err)
	}

	// Success!
	log.Println("✓ Settlement orchestration created successfully!")
	log.Printf("✓ RequestID: %s", buildResponse.RequestID)
	log.Printf("✓ Ephemeral Wallet: %s", buildResponse.EphemeralWalletAddress.Hex())

	// Print JSON output
	fmt.Println("\n" + buildResponse.RequestID)
	return nil
}
