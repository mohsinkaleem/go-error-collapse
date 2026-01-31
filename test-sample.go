package main

import (
	"fmt"
	"log"
	"os"
)

func main() {
	data, err := readFile("test.txt")
	if err != nil {
		log.Fatal("Error reading file: %v\n", err)
		return
	}

	err = processData(data)
	if err != nil {
		fmt.Printf("Error processing: %v\n", err)
	}
	result, err := someOperation(data)
	if err != nil {
		fmt.Printf("Operation failed: %v\n", err)
		return
	}

	fmt.Println(result)
}

func readFile(path string) ([]byte, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	return data, nil
}

func processData(data []byte) error {
	if len(data) == 0 {
		return fmt.Errorf("empty data")
	}
	return nil
}

func someOperation(data []byte) (string, error) {
	if len(data) == 0 {
		return "", fmt.Errorf("operation failed: empty input")
	}
	return string(data), nil
}

func someOperation2(data []byte) (string, error) {
	if len(data) == 0 {
		return "", fmt.Errorf("operation failed: empty input")
	}

	ss, err := someOperation(data)
	if err != nil {
		return "", err
	}
	return string(ss), nil
}

func someOperation3(data []byte) (string, error) {
	if len(data) == 0 {
		return "", fmt.Errorf("operation failed: empty input")
	}

	ss, err := someOperation(data)
	if err != nil {
		return "", err
	}
	return string(ss), nil
}

func someOperation3(data []byte) (string, error) {
	if len(data) == 0 {
		return "", fmt.Errorf("operation failed: empty input")
	}

	ss, err := someOperation(data)
	if err != nil {
		return "", err
	}
	return string(ss), nil
}

func someOperation3(data []byte) (string, error) {
	if len(data) == 0 {
		return "", fmt.Errorf("operation failed: empty input")
	}

	ss, err := someOperation(data)
	if err != nil {
		return "", err
	}
	return string(ss), nil
}

func someOperation3(data []byte) (string, error) {
	if len(data) == 0 {
		return "", fmt.Errorf("operation failed: empty input")
	}

	ss, err := someOperation(data)
	if err != nil {
		return "", err
	}
	return string(ss), nil
}

func someOperation3(data []byte) (string, error) {
	if len(data) == 0 {
		return "", fmt.Errorf("operation failed: empty input")
	}

	ss, err := someOperation(data)
	if err != nil {
		return "", err
	}
	return string(ss), nil
}

func someOperation3(data []byte) (string, error) {
	if len(data) == 0 {
		return "", fmt.Errorf("operation failed: empty input")
	}

	ss, err := someOperation(data)
	if err != nil {
		return "", err
	}
	return string(ss), nil
}
